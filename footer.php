			</div>

			<footer role="contentinfo" id="small-footer" class="uconn-blue box-shadow hidden-desktop">
				<a class="small-logo" href="http://uconn.edu" id="uc-uconn">
				<img src="<?php echo get_template_directory_uri(); ?>/uconn/small-logo.png" alt="University of Connecticut">
				</a>
				<a class="small-uconn" href="http://uconn.edu">
					<img src="<?php echo get_template_directory_uri(); ?>/uconn/uconn-footer.png" alt="University of Connecticut">
				</a>

				<div class="info-button circle pull-right">
				<i class="iconic-info icon-footer" data-toggle="collapse" data-target=".foot-collapse"></i>
					<div class="foot-collapse">
					<?php bones_footer_links(); // Adjust using Menus in Wordpress Admin ?>
					</div>

				</div>
			</footer>
			<footer role="contentinfo" id="uc-foot-wrap" class="uconn-blue box-shadow visible-desktop">
			
				<div id="inner-footer" class="clearfix">
		          <hr />
				<ul id="uc-foot-links">
					<li id="uc-copyright-mobile">University of Connecticut</li>
					<li><a href="http://uconn.edu/azindex.php" >UConn A-Z Index</a></li>
					<li><a href="http://uconn.edu/" >UConn Home</a></li>
					<li><a href="http://uconn.edu/disclaimers-and-copyrights.php" >Disclaimers, Privacy &amp; Copyright</a></li>
					<li><a href="contact.html">Contact Us</a></li>
				</ul>
					
					<nav class="clearfix">
						<?php bones_footer_links(); // Adjust using Menus in Wordpress Admin ?>
					</nav>
							
				</div> <!-- end #inner-footer -->
				
			</footer> <!-- end footer -->
		
		</div> <!-- end #container -->
		  <script src="//ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js"></script>
		  <script src="<?php echo get_template_directory_uri(); ?>/uconn/script.js"></script>
		<!--[if lt IE 7 ]>
  			<script src="//ajax.googleapis.com/ajax/libs/chrome-frame/1.0.3/CFInstall.min.js"></script>
  			<script>window.attachEvent('onload',function(){CFInstall.check({mode:'overlay'})})</script>
		<![endif]-->

		<?php wp_footer(); // js scripts are inserted using this function ?>
		</div>
	</body>

</html>